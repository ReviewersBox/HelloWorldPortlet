/**
 * Licensed to Jasig under one or more contributor license
 * agreements. See the NOTICE file distributed with this work
 * for additional information regarding copyright ownership.
 * Jasig licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a
 * copy of the License at:
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.jasig.portlet.hello.mvc.portlet;

import java.util.Map;

import javax.portlet.PortletPreferences;
import javax.portlet.PortletRequest;
import javax.portlet.RenderRequest;
import javax.portlet.RenderResponse;

import org.jasig.portlet.hello.mvc.IViewSelector;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.portlet.bind.annotation.ActionMapping;
import org.springframework.web.portlet.bind.annotation.RenderMapping;
import org.springframework.web.portlet.ModelAndView;

/**
 * Main portlet view.
 */
@Controller
@RequestMapping("VIEW")
public class MainController {

    protected final Log logger = LogFactory.getLog(getClass());
    
    private IViewSelector viewSelector;
    
    public static final String GREETING_MESSAGE_PREFERENCE = "MainController.greetingMessage";
    public static final String GREETING_MESSAGE_DEFAULT = "Good day";
    
    @Autowired(required = true)
    public void setViewSelector(IViewSelector viewSelector) {
        this.viewSelector = viewSelector;
    }
    
    @RenderMapping
    public ModelAndView showMainView(
            final RenderRequest request, final RenderResponse response) {

        // determine if the request represents a mobile browser and set the
        // view name accordingly
        final boolean isMobile = viewSelector.isMobile(request);
        final String viewName = isMobile ? "main-jQM" : "main";        
        final ModelAndView mav = new ModelAndView(viewName);
        PortletPreferences prefs = request.getPreferences();
        final String greetingMessage = prefs.getValue(GREETING_MESSAGE_PREFERENCE,GREETING_MESSAGE_DEFAULT);
        
        if(logger.isDebugEnabled()) {
            logger.debug("Using view name " + viewName + " for main view");
        }

        //Get the USER_INFO from portlet.xml,
        //which gets it from personDirectoryContext.xml
        @SuppressWarnings("unchecked")
        final Map<String,String> userInfo = (Map<String,String>) request.
                getAttribute(PortletRequest.USER_INFO);
        
        mav.addObject("username", request.getRemoteUser());
        mav.addObject("displayName", userInfo.get("displayName"));
        mav.addObject("emailAddress", userInfo.get("mail"));

        if(logger.isDebugEnabled()) {
            logger.debug("Rendering main view");
        }
        
        mav.addObject("greetingMessage", greetingMessage);


        return mav;

    }

    @ActionMapping
    public void doAction() {
        // no-op action mapping to prevent accidental calls to this URL from
        // crashing the portlet
    }

}
